// BOJ - 2110 공유기 설치

#include <iostream>
#include <algorithm>
#define MAXN 200000 + 1
#define ll long long

using namespace std; int n, c, ans = 0;

ll map[MAXN] = {0, };

ll max(ll a, ll b)
{
    return a > b ? a : b;
}

ll eval(ll val)
{
    ll ret = 1, cur = map[0];
    for(int i = 1; i < n; i++)
    {
        if(map[i] - cur >= val)
        {
            ret += 1;
            cur = map[i];
        }
    }
    return ret;
}

void parametric_search(ll s, ll e)
{
    while(s <= e)
    {
        ll m = (s + e) / 2;
        ll em = eval(m);
        if(em < c) e = m - 1;
        else
        {
            s = m + 1;
            ans = max(ans, m);
        }
    }
}

int main()
{
    cin.tie(0); ios::sync_with_stdio(false);

    cin >> n >> c;

    for(int i = 0; i < n; i++) cin >> map[i];

    sort(map, map + n);

    parametric_search(1, map[n - 1] - map[0]);

    cout << ans;
}