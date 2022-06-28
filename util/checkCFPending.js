const config = require("../config.json");
module.exports = async ({cf, prisma}) => {
    // fetch pending domains
    const pendingDomains = await prisma.domain.findMany({
        where: {
            status: 'PENDING_NS'
        }
    })
    let invalidDomains = []
    let expiredDomains = []
    let activatedDomains = []
    for (let domain of pendingDomains) {
        if (domain.cloudflareId === null) continue;
        let data;
        try {
            data = await cf.zones.read(domain.cloudflareId)
        } catch {
            invalidDomains.push(domain.id)
            continue
        }
        if (data.result.status === 'active' && !data.result.paused) {
            try {
                await cf.dnsRecords.add(domain.cloudflareId, {type: 'A', name: domain.domain, content: config.mainIP, ttl: 1, proxied: true})
                await cf.dnsRecords.add(domain.cloudflareId, {type: 'A', name: '*', content: config.mainIP, ttl: 1, proxied: true})
            } catch (e) {
                console.error(e)
            }
            activatedDomains.push(domain.id)
        } else if (parseInt(domain.created) + (3 * 24 * 60 * 60 * 1000) < Date.now()) {
            expiredDomains.push(domain.id)
        }
    }
    let domainsToDelete = [...invalidDomains, ...expiredDomains]
    await prisma.domain.deleteMany({
        where: {
            id: {
                in: domainsToDelete
            }
        }
    })
    await prisma.domain.updateMany({
        where: {
            id: {
                in: activatedDomains
            }
        },
        data: {
            status: 'ACTIVE'
        }
    })
}