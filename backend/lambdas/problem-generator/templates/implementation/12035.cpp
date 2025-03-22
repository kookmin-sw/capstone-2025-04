// BOJ - 12035 Dance Around The Clock (Small)

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
#define DEBUG false
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);

    int t; cin >> t;
    loop(_, 1, t) {
        cout << "Case #" << _ << ": ";
        ll d, k, n; cin >> d >> k >> n;
        n %= d;

        ll pk, l, r;
        if(k % 2 == 0) {
            pk = k == n ? d : (k - n + d) % d;
            l = (pk - n - 1 + d) % d, r = (pk - n + 1 + d) % d;
        }
        else {
            pk = k == -n ? d : (k + n) % d;
            l = (pk + n - 1 + d) % d, r = (pk + n + 1 + d) % d;
        }
        l = !l ? d : l, r = !r ? d : r;
        cout << r << ' ' << l << '\n';
    }
}